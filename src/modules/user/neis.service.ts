import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

const SUCCESS_CODE = 'INFO-000';
const NO_DATA_CODE = 'INFO-200';

type MealKey = 'breakfast' | 'lunch' | 'dinner';

interface NeisHeadItem {
  RESULT?: {
    CODE: string;
    MESSAGE: string;
  };
}

interface NeisSection<T> {
  head?: NeisHeadItem[];
  row?: T[];
}

interface SchoolInfoRow {
  SCHUL_NM: string;
}

interface MealRow {
  MMEAL_SC_NM: string;
  MLSV_YMD: string;
  DDISH_NM: string;
}

interface TimetableRow {
  PERIO: string;
  ALL_TI_YMD: string;
  ITRT_CNTNT: string;
  CLRM_NM?: string;
  TCHER_NM?: string;
}

export interface MealResponse {
  date: string | null;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

export interface TimetableParams {
  officeCode: string;
  schoolCode: string;
  grade: string;
  className: string;
  date?: string;
  schoolType?: 'els' | 'mis' | 'his' | 'sps';
}

export interface TimetableResponse {
  startDate: string;
  endDate: string;
  days: Array<{
    date: string;
    weekday: string;
    periods: Array<{
      period: number;
      subject: string;
      classroom?: string;
      teacher?: string;
    }>;
  }>;
}

export interface WeeklyTimetableResponse {
  startDate: string;
  endDate: string;
  days: Array<{
    date: string;
    weekday: string;
    periods: Array<{
      period: number;
      subject: string;
      classroom?: string;
      teacher?: string;
    }>;
  }>;
}

@Injectable()
export class NeisService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async validateSchool(
    educationOfficeCode: string,
    schoolCode: string,
  ): Promise<{ schoolName: string }> {
    const rows = await this.fetchRows<SchoolInfoRow>('schoolInfo', {
      ATPT_OFCDC_SC_CODE: educationOfficeCode,
      SD_SCHUL_CODE: schoolCode,
    });

    const school = rows[0];
    if (!school) {
      throw new BadRequestException('학교 정보를 찾을 수 없습니다.');
    }

    return { schoolName: school.SCHUL_NM };
  }

  async getMeals(params: {
    officeCode: string;
    schoolCode: string;
    date?: string;
  }): Promise<MealResponse> {
    let targetDate = this.ensureDate(params.date);
    let rows = await this.fetchRows<MealRow>(
      'mealServiceDietInfo',
      {
        ATPT_OFCDC_SC_CODE: params.officeCode,
        SD_SCHUL_CODE: params.schoolCode,
        MLSV_YMD: targetDate,
      },
      { pageSize: 100 },
    );

    if (rows.length === 0) {
      targetDate = this.getNextWeekday(targetDate);
      rows = await this.fetchRows<MealRow>(
        'mealServiceDietInfo',
        {
          ATPT_OFCDC_SC_CODE: params.officeCode,
          SD_SCHUL_CODE: params.schoolCode,
          MLSV_YMD: targetDate,
        },
        { pageSize: 100 },
      );
    }

    const meals: MealResponse = {
      date: rows[0]?.MLSV_YMD ?? targetDate ?? null,
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    for (const row of rows) {
      const key = this.mapMealKey(row.MMEAL_SC_NM);
      if (!key) {
        continue;
      }
      meals[key] = this.parseMealItems(row.DDISH_NM);
    }

    return meals;
  }

  async getTimetable(params: TimetableParams): Promise<TimetableResponse> {
    const weekly = await this.getWeeklyTimetable(params);
    return weekly;
  }

  async getWeeklyTimetable(
    params: TimetableParams,
  ): Promise<WeeklyTimetableResponse> {
    const endpoint = this.resolveTimetableEndpoint(params.schoolType);
    const { fromDate, toDate } = this.getWeekRange(params.date);

    const rows = await this.fetchRows<TimetableRow>(
      endpoint,
      {
        ATPT_OFCDC_SC_CODE: params.officeCode,
        SD_SCHUL_CODE: params.schoolCode,
        GRADE: params.grade,
        CLASS_NM: params.className,
        TI_FROM_YMD: fromDate,
        TI_TO_YMD: toDate,
      },
      { pageSize: 200 },
    );

    const daysMap = new Map<
      string,
      {
        weekday: string;
        periods: Array<{
          period: number;
          subject: string;
          classroom?: string;
          teacher?: string;
        }>;
      }
    >();

    for (const row of rows) {
      const date = row.ALL_TI_YMD;
      if (!date || date < fromDate || date > toDate) {
        continue;
      }

      const period = Number(row.PERIO);
      if (Number.isNaN(period) || period < 1 || period > 7) {
        continue;
      }

      const entry =
        daysMap.get(date) ??
        daysMap
          .set(date, {
            weekday: this.getWeekdayLabel(date),
            periods: [],
          })
          .get(date)!;

      entry.periods.push({
        period,
        subject: (row.ITRT_CNTNT ?? '').trim(),
        classroom: row.CLRM_NM?.trim() || undefined,
        teacher: row.TCHER_NM?.trim() || undefined,
      });
    }

    const days = Array.from(daysMap.entries())
      .map(([date, value]) => ({
        date,
        weekday: value.weekday,
        periods: value.periods.sort((a, b) => a.period - b.period),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      startDate: fromDate,
      endDate: toDate,
      days,
    };
  }

  private async fetchRows<T>(
    endpoint: string,
    params: Record<string, string | number | undefined>,
    options?: { pageSize?: number },
  ): Promise<T[]> {
    const apiKey = this.getApiKey();
    const { pageSize = 10 } = options ?? {};

    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, NeisSection<T>[]>>(
          `https://open.neis.go.kr/hub/${endpoint}`,
          {
            params: {
              KEY: apiKey,
              Type: 'json',
              pIndex: 1,
              pSize: pageSize,
              ...params,
            },
          },
        ),
      );

      const sections = response.data?.[endpoint];

      if (!Array.isArray(sections)) {
        return [];
      }

      const headSection = sections.find((section) => Array.isArray(section.head))
        ?.head;
      const result = headSection
        ?.find((item) => item.RESULT)
        ?.RESULT;

      if (result) {
        if (result.CODE === NO_DATA_CODE) {
          return [];
        }

        if (result.CODE !== SUCCESS_CODE) {
          throw new BadRequestException(
            result.MESSAGE ?? 'NEIS API 호출에 실패했습니다.',
          );
        }
      }

      const rows = sections.find((section) => Array.isArray(section.row))?.row;

      return rows ?? [];
    } catch (error) {
      const axiosError = error as any;
      const responseMessage =
        axiosError?.response?.data?.RESULT?.MESSAGE ??
        axiosError?.response?.data?.RESULT?.MSG ??
        axiosError?.response?.data?.RESULT?.MESSAGE;

      if (responseMessage) {
        throw new BadRequestException(responseMessage);
      }

      throw new BadRequestException('NEIS API 호출 중 오류가 발생했습니다.');
    }
  }

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('NEIS_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'NEIS_API_KEY가 설정되어 있지 않습니다.',
      );
    }
    return apiKey;
  }

  private ensureDate(date?: string): string {
    if (date && /^\d{8}$/.test(date)) {
      return date;
    }
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private parseDate(date: string): Date {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(4, 6)) - 1;
    const day = Number(date.slice(6, 8));
    return new Date(year, month, day);
  }

  private getWeekRange(date?: string): { fromDate: string; toDate: string } {
    const base = this.parseDate(this.ensureDate(date));
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return {
      fromDate: this.formatDate(monday),
      toDate: this.formatDate(friday),
    };
  }

  private getWeekdayLabel(date: string): string {
    const weekday = this.parseDate(date).getDay();
    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    return labels[weekday] ?? '';
  }

  private getNextWeekday(date: string): string {
    const current = this.parseDate(date);
    do {
      current.setDate(current.getDate() + 1);
    } while (current.getDay() === 0 || current.getDay() === 6);
    return this.formatDate(current);
  }

  private mapMealKey(mealName: string): MealKey | null {
    if (!mealName) {
      return null;
    }

    if (mealName.includes('조식')) {
      return 'breakfast';
    }

    if (mealName.includes('중식')) {
      return 'lunch';
    }

    if (mealName.includes('석식')) {
      return 'dinner';
    }

    return null;
  }

  private parseMealItems(raw: string): string[] {
    if (!raw) {
      return [];
    }

    return raw
      .split('<br/>')
      .map((item) =>
        item
          .replace(/\([^)]*\)/g, '')
          .replace(/\d+\./g, '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean);
  }

  private resolveTimetableEndpoint(
    schoolType: TimetableParams['schoolType'],
  ): string {
    const normalized = (schoolType ?? 'his').toLowerCase();
    const mapping: Record<string, string> = {
      els: 'elsTimetable',
      mis: 'misTimetable',
      his: 'hisTimetable',
      sps: 'spsTimetable',
    };

    return mapping[normalized] ?? mapping.his;
  }
}
