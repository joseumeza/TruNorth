/**
 * Runtime-composed player avatar (spec §7.5): body base tinted by skin tone
 * plus a hair overlay, generated as inline SVG so the 5×5 matrix needs no
 * pre-composed art files. For the 3/4 top-down view the avatar has three
 * poses — front ('down'), back ('up'), and profile ('side', mirrored for
 * left-facing via CSS --flip).
 */
import type { AvatarConfig, HairStyle, SkinTone } from '../types';

export type AvatarPose = 'down' | 'up' | 'side';

const SKIN: Record<SkinTone, string> = {
  tone_1: '#f6d7b8',
  tone_2: '#e0ac7e',
  tone_3: '#c68955',
  tone_4: '#9c6b3f',
  tone_5: '#6f4a2b',
};

const HAIR_COLOR = '#3a2a1a';

const HAIR_PATHS: Record<HairStyle, string> = {
  hair_curly:
    '<circle cx="48" cy="18" r="11" fill="{c}"/><circle cx="64" cy="12" r="12" fill="{c}"/><circle cx="80" cy="18" r="11" fill="{c}"/><circle cx="42" cy="30" r="9" fill="{c}"/><circle cx="86" cy="30" r="9" fill="{c}"/>',
  hair_straight:
    '<path d="M 38 34 Q 64 6 90 34 L 90 52 Q 87 40 82 36 Q 64 24 46 36 Q 41 40 38 52 Z" fill="{c}"/>',
  hair_braids:
    '<path d="M 40 30 Q 64 8 88 30 Q 76 20 64 20 Q 52 20 40 30" fill="{c}"/><rect x="34" y="30" width="10" height="34" rx="5" fill="{c}"/><rect x="84" y="30" width="10" height="34" rx="5" fill="{c}"/>',
  hair_short:
    '<path d="M 40 30 Q 64 10 88 30 Q 76 22 64 22 Q 52 22 40 30" fill="{c}"/>',
  hair_puffs:
    '<circle cx="44" cy="18" r="13" fill="{c}"/><circle cx="84" cy="18" r="13" fill="{c}"/><path d="M 42 32 Q 64 16 86 32 Q 74 26 64 26 Q 54 26 42 32" fill="{c}"/>',
};

const FACE: Record<AvatarPose, string> = {
  down: [
    '<circle cx="55" cy="40" r="4" fill="#3d3d3d"/>',
    '<circle cx="73" cy="40" r="4" fill="#3d3d3d"/>',
    '<path d="M 57 51 Q 64 55 71 51" stroke="#3d3d3d" stroke-width="3" fill="none" stroke-linecap="round"/>',
  ].join(''),
  // Profile faces stage-right; CSS --flip mirrors it for left.
  side: [
    '<circle cx="78" cy="40" r="4" fill="#3d3d3d"/>',
    '<path d="M 78 51 Q 83 53 86 50" stroke="#3d3d3d" stroke-width="3" fill="none" stroke-linecap="round"/>',
  ].join(''),
  // Back view: hair wraps over where the face would be.
  up: `<path d="M 42 28 Q 64 18 86 28 L 86 50 Q 64 64 42 50 Z" fill="${HAIR_COLOR}"/>`,
};

/** 128×128 logical sprite, feet-center anchored by the renderer. */
export function avatarSvg(config: AvatarConfig, pose: AvatarPose = 'down'): string {
  const skin = SKIN[config.skinTone];
  const hair = HAIR_PATHS[config.hair].replaceAll('{c}', HAIR_COLOR);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">',
    '<ellipse cx="64" cy="122" rx="30" ry="6" fill="#000" opacity="0.12"/>',
    '<rect x="42" y="58" width="44" height="48" rx="18" fill="#3aa6a0"/>',
    '<rect x="36" y="76" width="14" height="30" rx="7" fill="#3aa6a0"/>',
    '<rect x="78" y="76" width="14" height="30" rx="7" fill="#3aa6a0"/>',
    '<rect x="46" y="102" width="14" height="22" rx="6" fill="#33518a"/>',
    '<rect x="68" y="102" width="14" height="22" rx="6" fill="#33518a"/>',
    `<circle cx="64" cy="38" r="26" fill="${skin}"/>`,
    hair,
    FACE[pose],
    '</svg>',
  ].join('');
}
