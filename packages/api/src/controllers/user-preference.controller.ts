import { Request, Response } from 'express';

import { BadRequestException, NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { UserPreferenceService } from '../services/database/user-preference.service.ts';

const accessTokenService = new AccessTokenService();
const userPreferenceService = new UserPreferenceService();

export async function getCurrentUserPreferences(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const userPreference = await userPreferenceService.getByUserId(user.id);

    if (!userPreference) {
      // If no preferences exist, create default ones
      const defaultPreferences = await userPreferenceService.createDefault(user.id);
      res.status(200).json(defaultPreferences);
      return;
    }

    res.status(200).json(userPreference);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateCurrentUserPreferences(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const payload = parseBody(req.body) as Record<string, unknown>;
    const userPreference = await userPreferenceService.upsert(user.id, payload);

    res.status(200).json(userPreference);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function deleteUserPreference(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Verify preference belongs to user
    const existingPreference = await userPreferenceService.getSingle({ id });
    if (!existingPreference) {
      throw new NotFoundException('User preference not found');
    }

    if (existingPreference.userId !== user.id) {
      throw new BadRequestException('Access denied');
    }

    const userPreference = await userPreferenceService.deleteSingle(id);

    res.status(200).json(userPreference);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function resetCurrentUserPreferences(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Check if preferences exist
    const existingPreference = await userPreferenceService.getByUserId(user.id);

    if (existingPreference) {
      // Update existing preferences to default values
      const resetPreferences = await userPreferenceService.updateSingle(existingPreference.id, {
        monthlyStartDate: 25,
        weeklyStartDay: 1, // Monday
        limitPeriod: 'monthly',
        categoryPeriod: 'monthly',
      });
      res.status(200).json(resetPreferences);
    } else {
      // Create default preferences if none exist
      const defaultPreferences = await userPreferenceService.createDefault(user.id);
      res.status(200).json(defaultPreferences);
    }
  } catch (err) {
    getErrorResponse(res, err);
  }
}
