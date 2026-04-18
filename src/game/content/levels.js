export const STORY_LEVELS = [
  { id: 1, title: 'Sunny Wake-Up', tier: 1, waves: 4, reward: { gold: 35, gems: 0 }, allowedTemplates: ['choose_total_from_visual_groups', 'choose_larger_or_smaller_ship'] },
  { id: 2, title: 'Parrot Patrol', tier: 1, waves: 4, reward: { gold: 40, gems: 0 }, allowedTemplates: ['choose_total_from_visual_groups', 'choose_larger_or_smaller_ship', 'hit_marker_matching_grouped_objects'] },
  { id: 3, title: 'Shell Shore', tier: 1, waves: 5, reward: { gold: 45, gems: 1 }, allowedTemplates: ['choose_total_from_visual_groups', 'find_remaining_after_storm', 'choose_larger_or_smaller_ship'] },
  { id: 4, title: 'Coconut Current', tier: 1, waves: 5, reward: { gold: 50, gems: 1 }, allowedTemplates: ['choose_total_from_visual_groups', 'hit_marker_matching_grouped_objects', 'choose_larger_or_smaller_ship'] },
  { id: 5, title: 'Treasure Tides', tier: 2, waves: 5, reward: { gold: 55, gems: 1 }, allowedTemplates: ['choose_total_from_visual_groups', 'find_remaining_after_storm', 'choose_larger_or_smaller_ship'] },
  { id: 6, title: 'Bright Buoys', tier: 2, waves: 5, reward: { gold: 60, gems: 1 }, allowedTemplates: ['hit_marker_matching_grouped_objects', 'find_remaining_after_storm', 'choose_larger_or_smaller_ship'] },
  { id: 7, title: 'Ten Chest Bay', tier: 2, waves: 5, reward: { gold: 65, gems: 2 }, allowedTemplates: ['choose_total_from_visual_groups', 'find_remaining_after_storm', 'split_treasure_evenly'] },
  { id: 8, title: 'Foamy Rescue', tier: 2, waves: 6, reward: { gold: 70, gems: 2 }, allowedTemplates: ['choose_larger_or_smaller_ship', 'hit_marker_matching_grouped_objects', 'split_treasure_evenly'] },
  { id: 9, title: 'Crew Stacks', tier: 3, waves: 6, reward: { gold: 75, gems: 2 }, allowedTemplates: ['count_equal_barrels_or_crates', 'choose_total_from_visual_groups', 'split_treasure_evenly'] },
  { id: 10, title: 'Barrel Bridge', tier: 3, waves: 6, reward: { gold: 80, gems: 2 }, allowedTemplates: ['count_equal_barrels_or_crates', 'hit_marker_matching_grouped_objects', 'choose_larger_or_smaller_ship'] },
  { id: 11, title: 'Raft Rally', tier: 3, waves: 6, reward: { gold: 85, gems: 2 }, allowedTemplates: ['count_equal_barrels_or_crates', 'split_treasure_evenly', 'choose_total_from_visual_groups'] },
  { id: 12, title: 'Treasure Splitter', tier: 3, waves: 6, reward: { gold: 90, gems: 3 }, allowedTemplates: ['split_treasure_evenly', 'find_remaining_after_storm', 'count_equal_barrels_or_crates'] },
  { id: 13, title: 'Gilded Groups', tier: 3, waves: 6, reward: { gold: 95, gems: 3 }, allowedTemplates: ['choose_total_from_visual_groups', 'count_equal_barrels_or_crates', 'hit_marker_matching_grouped_objects'] },
  { id: 14, title: 'Captain Shares', tier: 4, waves: 6, reward: { gold: 100, gems: 3 }, allowedTemplates: ['split_treasure_evenly', 'count_equal_barrels_or_crates', 'choose_total_from_visual_groups'] },
  { id: 15, title: 'Multiply Cove', tier: 4, waves: 6, reward: { gold: 105, gems: 3 }, allowedTemplates: ['choose_total_from_visual_groups', 'hit_marker_matching_grouped_objects', 'count_equal_barrels_or_crates'] },
  { id: 16, title: 'Even Tide', tier: 4, waves: 7, reward: { gold: 110, gems: 4 }, allowedTemplates: ['split_treasure_evenly', 'find_remaining_after_storm', 'count_equal_barrels_or_crates'] },
  { id: 17, title: 'Captain Clever', tier: 4, waves: 7, reward: { gold: 115, gems: 4 }, allowedTemplates: ['choose_total_from_visual_groups', 'choose_larger_or_smaller_ship', 'split_treasure_evenly'] },
  { id: 18, title: 'Golden Lagoon', tier: 4, waves: 7, reward: { gold: 125, gems: 5 }, allowedTemplates: ['choose_total_from_visual_groups', 'count_equal_barrels_or_crates', 'split_treasure_evenly', 'hit_marker_matching_grouped_objects'] }
];

export const QUICK_PLAY_CONFIG = {
  startingTier: 1,
  tierStepEvery: 4,
  rewardRate: 0.08,
};

export function getLevelById(levelId) {
  return STORY_LEVELS.find((level) => level.id === levelId) ?? STORY_LEVELS[0];
}
