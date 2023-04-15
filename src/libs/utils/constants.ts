import { getRootData } from '@sapphire/pieces' 
import { join } from 'node:path';

export const mainFolder = getRootData().root;
export const rootFolder = join(mainFolder, '..');