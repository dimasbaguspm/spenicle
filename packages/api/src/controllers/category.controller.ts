import { Request, Response } from 'express';

import { NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId, parseQuery, parseMultipleIds } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { CategoryService } from '../services/database/category.service.ts';

const accessTokenService = new AccessTokenService();
const categoryService = new CategoryService();

export async function listCategories(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Parse the base query parameters and add the specific groupId
    const baseFilters = parseQuery(req.query);
    const parsedFilters = {
      ...baseFilters,
      groupId: user.groupId,
      // Parse array parameters
      ids: parseMultipleIds(req.query.ids, 'category IDs'),
      parentIds: parseMultipleIds(req.query.parentIds, 'parent category IDs'),
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(Object.entries(parsedFilters).filter(([, value]) => value !== undefined));

    const categories = await categoryService.getMany(cleanFilters);

    res.status(200).json(categories);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Ensure the category is created for the user's group
    const payload = { ...parseBody(req.body), groupId: user.groupId };

    const category = await categoryService.createSingle(payload);

    res.status(201).json(category);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getCategory(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);
    const category = await categoryService.getSingle({ ids: [id], groupId: user.groupId });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    res.status(200).json(category);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Verify category belongs to user's group
    const existingCategory = await categoryService.getSingle({ ids: [id], groupId: user.groupId });
    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    const category = await categoryService.updateSingle(id, parseBody(req.body));

    res.status(200).json(category);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Verify category belongs to user's group
    const existingCategory = await categoryService.getSingle({ ids: [id], groupId: user.groupId });
    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    const category = await categoryService.deleteSingle(id);

    res.status(200).json(category);
  } catch (err) {
    getErrorResponse(res, err);
  }
}
