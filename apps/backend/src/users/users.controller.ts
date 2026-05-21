import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateChildProfileDto, UpdateChildProfileDto } from './dto/child-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AddressResponseDto,
  ChildProfileResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── 프로필 ─────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiOkResponse({ type: UserResponseDto })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: '프로필 수정 (이름, 전화번호)' })
  @ApiOkResponse({ type: UserResponseDto })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '회원 탈퇴 (개인정보 익명화 처리)' })
  deleteAccount(@CurrentUser() user: JwtPayload) {
    return this.usersService.deleteAccount(user.sub);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 변경' })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.sub, dto);
  }

  // ── 자녀 정보 ──────────────────────────────────────────────────────────────

  @Get('me/children')
  @ApiOperation({ summary: '자녀 정보 목록 조회' })
  @ApiOkResponse({ type: [ChildProfileResponseDto] })
  getChildren(@CurrentUser() user: JwtPayload) {
    return this.usersService.getChildren(user.sub);
  }

  @Post('me/children')
  @ApiOperation({ summary: '자녀 정보 추가' })
  @ApiCreatedResponse({ type: ChildProfileResponseDto })
  addChild(@CurrentUser() user: JwtPayload, @Body() dto: CreateChildProfileDto) {
    return this.usersService.addChild(user.sub, dto);
  }

  @Patch('me/children/:childId')
  @ApiOperation({ summary: '자녀 정보 수정' })
  @ApiOkResponse({ type: ChildProfileResponseDto })
  updateChild(
    @CurrentUser() user: JwtPayload,
    @Param('childId') childId: string,
    @Body() dto: UpdateChildProfileDto,
  ) {
    return this.usersService.updateChild(user.sub, childId, dto);
  }

  @Delete('me/children/:childId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '자녀 정보 삭제' })
  removeChild(@CurrentUser() user: JwtPayload, @Param('childId') childId: string) {
    return this.usersService.removeChild(user.sub, childId);
  }

  // ── 배송지 ─────────────────────────────────────────────────────────────────

  @Get('me/addresses')
  @ApiOperation({ summary: '배송지 목록 조회' })
  @ApiOkResponse({ type: [AddressResponseDto] })
  getAddresses(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAddresses(user.sub);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: '배송지 추가' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  addAddress(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.sub, dto);
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: '배송지 수정' })
  @ApiOkResponse({ type: AddressResponseDto })
  updateAddress(
    @CurrentUser() user: JwtPayload,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.sub, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '배송지 삭제' })
  removeAddress(@CurrentUser() user: JwtPayload, @Param('addressId') addressId: string) {
    return this.usersService.removeAddress(user.sub, addressId);
  }
}
