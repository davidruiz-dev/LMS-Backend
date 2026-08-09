import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser, UserPayload } from 'src/auth/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: UserPayload) {
    return this.profileService.getMyProfile(user.id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: UserPayload, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  changePassword(@CurrentUser() user: UserPayload, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  updateAvatar(@CurrentUser() user: UserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.profileService.updateAvatar(user.id, file);
  }

  @Get('me/stats')
  getMyStats(@CurrentUser() user: UserPayload) {
    return this.profileService.getStats(user.id);
  }

  @Get(':userId')
  getPublicProfile(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: UserPayload) {
    return this.profileService.getPublicProfile(userId, user);
  }
}
