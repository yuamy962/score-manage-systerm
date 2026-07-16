import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsDateString, Min, Max, MinLength, Matches, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Role, TaskStatus, ScoreType, ScoreSourceType, TaskType, TaskAction, TaskSource, ReviewStyle, AppealStatus } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: '密码必须包含字母和数字' })
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' })
  phone?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' })
  phone?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: '密码必须包含字母和数字' })
  password: string;
}

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0.5)
  estimatedDays: number;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsEnum(TaskSource)
  taskSource?: TaskSource;

  @IsOptional()
  @IsString()
  sourceNo?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsEnum(TaskAction)
  taskAction?: TaskAction;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  scoreRatio?: number;

  @IsOptional()
  @IsDateString()
  planFinishAt?: string;

  @IsOptional()
  @IsBoolean()
  isPoolTask?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  claimRatio?: number;

  @IsOptional()
  @IsString()
  systemModuleId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeDto)
  assignees?: AssigneeDto[];
}

export class AssigneeDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  ratio: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedDays?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  finalDays?: number;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsEnum(TaskSource)
  taskSource?: TaskSource;

  @IsOptional()
  @IsString()
  sourceNo?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsEnum(TaskAction)
  taskAction?: TaskAction;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  scoreRatio?: number;

  @IsOptional()
  @IsDateString()
  planFinishAt?: string;

  @IsOptional()
  @IsString()
  systemModuleId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeDto)
  assignees?: AssigneeDto[];
}

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  finalDays?: number;
}

export class ApproveTaskDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  finalDays?: number;
}

export class ApproveClaimDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ratio?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeDto)
  addAssignees?: AssigneeDto[];
}

export class CreateScoreDto {
  @IsString()
  targetUserId: string;

  @IsEnum(ScoreType)
  type: ScoreType;

  @IsNumber()
  @Type(() => Number)
  score: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsEnum(ScoreSourceType)
  sourceType?: ScoreSourceType;

  @IsOptional()
  @IsString()
  sourceNo?: string;

  @IsOptional()
  @IsString()
  sourceName?: string;
}

export class UpdateScoreConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeConfigDto)
  configs: GradeConfigDto[];
}

export class GradeConfigDto {
  @IsString()
  grade: string;

  @IsNumber()
  @Type(() => Number)
  minScore: number;
}

export class CreateAppealDto {
  @IsString()
  scoreRecordId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  evidence?: string;
}

export class ReviewAppealDto {
  @IsEnum(AppealStatus)
  status: AppealStatus;

  @IsOptional()
  @IsString()
  pmOpinion?: string;

  @IsOptional()
  @IsString()
  result?: string;
}

export class ApplyExtensionDto {
  @IsString()
  reason: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  extendDays: number;
}

export class ReviewExtensionDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePenaltyConfigDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dailyDecayRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minScoreRatio?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyExtLimit?: number;
}

export class UpdateTaskConfigDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  pmBonusRatio: number;
}

export class GenerateReviewDto {
  @IsString()
  userId: string;

  @IsString()
  month: string;

  @IsOptional()
  @IsEnum(ReviewStyle)
  style?: ReviewStyle;
}

export class BatchGenerateReviewDto {
  @IsString()
  month: string;

  @IsOptional()
  @IsEnum(ReviewStyle)
  style?: ReviewStyle;
}

export class UpdateReviewDto {
  @IsString()
  content: string;
}

export class BatchPublishDto {
  @IsString()
  month: string;
}
