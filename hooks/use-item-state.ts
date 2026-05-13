"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Item, ItemCategory, AppliedSkill } from "@/lib/database.types";
import { saveItem, getTags, getItemVersions, createTag } from "@/app/actions";
import { isValidSlug } from "@/lib/tags";
import { applySkill, scanSkills, removeSkillFromContent } from "@/lib/skills";
import { arraysEqualUnordered } from "@/lib/equality";
import { extractAgent, applyAgent, removeAgent, normalizeAgentTitle } from "@/lib/agent";

interface Version {
  id: string;
  content_snapshot: string;
  applied_skills_snapshot: AppliedSkill[];
  created_at: string;
}

interface SaveSnapshot {
  content: string;
  title: string;
  category: ItemCategory;
  tags: string[];
  appliedSkills: AppliedSkill[];
  isFavorite: boolean;
}

interface UseItemStateReturn {
  editedContent: string;
  title: string;
  category: ItemCategory;
  tags: string[];
  isFavorite: boolean;
  isContentDirty: boolean;
  committedAgent: string | null;
  currentAgentName: string | null;
  draftSkillNames: string[];
  isSaving: boolean;
  saveError: string | null;
  versions: Version[];
  availableTags: string[];
  setTitle: (v: string) => void;
  setCategory: (v: ItemCategory) => void;
  setTags: (v: string[]) => void;
  setEditedContent: (v: string) => void;
  setSaveError: (v: string | null) => void;
  handleSave: () => Promise<boolean>;
  handleCancel: () => void;
  handleToggleFavorite: () => void;
  handleAddTag: (raw: string) => Promise<void>;
  handleRemoveTag: (tag: string) => void;
  handleRestoreVersion: (snapshot: string, snapshotSkills: AppliedSkill[]) => Promise<boolean>;
  handleAddSkill: (skill: { id: string; title: string }) => void;
  handleRemoveSkill: (skillName: string) => void;
  handleAssignAgent: (agent: { title: string }, onReplace: (title: string) => void) => void;
  handleConfirmAgentReplace: (pendingTitle: string) => void;
  handleUnassignAgent: () => void;
  refreshVersions: () => Promise<void>;
}

export function useItemState(item: Item): UseItemStateReturn {
  const [committed, setCommitted] = useState({
    content: item.content,
    title: item.title,
    category: item.category,
    tags: item.tags,
    appliedSkills: item.applied_skills,
    isFavorite: item.is_favorite,
  });

  const [editedContent, setEditedContent] = useState(item.content);
  const [title, setTitleState] = useState(item.title);
  const [category, setCategoryState] = useState<ItemCategory>(item.category);
  const [tags, setTagsState] = useState<string[]>(item.tags);
  const [isFavorite, setIsFavoriteState] = useState(item.is_favorite);
  const [appliedSkills, setAppliedSkillsState] = useState<AppliedSkill[]>(item.applied_skills);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Ref for latest tags to avoid stale closure in the async handleAddTag.
  // Double-add in rapid succession is not a realistic UX concern for a single
  // text input that clears on submit, but we still prefer correct duplicate checks.
  const tagsRef = useRef(tags);
  useEffect(() => { tagsRef.current = tags; }, [tags]);

  const committedAgent = useMemo(() => extractAgent(committed.content), [committed.content]);
  const currentAgentName = useMemo(() => extractAgent(editedContent), [editedContent]);
  const draftSkillNames = useMemo(() => scanSkills(editedContent), [editedContent]);

  const isContentDirty = useMemo(
    () =>
      editedContent !== committed.content ||
      title !== committed.title ||
      category !== committed.category ||
      !arraysEqualUnordered(tags, committed.tags) ||
      !arraysEqualUnordered(appliedSkills, committed.appliedSkills, (s) => s.id) ||
      isFavorite !== committed.isFavorite,
    [editedContent, committed, title, category, tags, appliedSkills, isFavorite]
  );

  useEffect(() => {
    let cancelled = false;
    getTags().then((data) => { if (!cancelled) setAvailableTags(data); });
    getItemVersions(item.id).then((data) => { if (!cancelled) setVersions(data); });
    return () => { cancelled = true; };
  }, [item.id]);

  const commitSave = async (snapshot: SaveSnapshot, errorPrefix: string): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveItem(
        item.id,
        snapshot.content,
        snapshot.title,
        snapshot.category,
        snapshot.tags,
        snapshot.appliedSkills,
        snapshot.isFavorite
      );

      if (result.success) {
        setCommitted({
          content: result.content || snapshot.content,
          title: snapshot.title,
          category: snapshot.category,
          tags: [...snapshot.tags],
          appliedSkills: [...snapshot.appliedSkills],
          isFavorite: snapshot.isFavorite,
        });
        const newVersions = await getItemVersions(item.id);
        setVersions(newVersions);
        return true;
      } else {
        setSaveError(result.error || errorPrefix);
        return false;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    return await commitSave(
      { content: editedContent, title, category, tags, appliedSkills, isFavorite },
      "Error saving"
    );
  };

  const handleCancel = () => {
    setTitleState(committed.title);
    setCategoryState(committed.category);
    setTagsState([...committed.tags]);
    setAppliedSkillsState([...committed.appliedSkills]);
    setIsFavoriteState(committed.isFavorite);
    setEditedContent(committed.content);
    setSaveError(null);
  };

  const handleToggleFavorite = () => {
    setIsFavoriteState((prev) => !prev);
    setSaveError(null);
  };

  const handleAddTag = async (raw: string) => {
    const slug = raw.toLowerCase().replace(/\s+/g, "_");
    if (!isValidSlug(raw)) {
      setSaveError("Slug must be snake_case (lowercase, digits, underscores).");
      return;
    }

    if (!tagsRef.current.includes(slug)) {
      if (!availableTags.includes(slug)) {
        const result = await createTag(slug);
        if (result.success) {
          setAvailableTags((prev) => [...prev, result.slug!]);
          setTagsState((prev) => [...prev, result.slug!]);
        }
      } else {
        setTagsState((prev) => [...prev, slug]);
      }
    }
    setSaveError(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsState((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleRestoreVersion = async (
    snapshot: string,
    snapshotAppliedSkills: AppliedSkill[]
  ) => {
    setAppliedSkillsState(snapshotAppliedSkills);
    setEditedContent(snapshot);
    // title/category/tags/isFavorite are not stored in versions — keep current values
    return await commitSave(
      { content: snapshot, title, category, tags, appliedSkills: snapshotAppliedSkills, isFavorite },
      "Error restoring"
    );
  };

  const handleAddSkill = (skill: { id: string; title: string }) => {
    const result = applySkill(editedContent, appliedSkills, skill.id, skill.title);
    if (result === null) return;
    setAppliedSkillsState(result.appliedSkills);
    setEditedContent(result.content);
    setSaveError(null);
  };

  const handleRemoveSkill = (skillName: string) => {
    const newContent = removeSkillFromContent(editedContent, skillName);
    setAppliedSkillsState((prev) => prev.filter((s) => s.name !== skillName));
    setEditedContent(newContent);
    setSaveError(null);
  };

  const handleAssignAgent = (
    agent: { title: string },
    onReplace: (title: string) => void
  ) => {
    if (currentAgentName && normalizeAgentTitle(currentAgentName) === normalizeAgentTitle(agent.title)) return;
    if (currentAgentName) {
      onReplace(agent.title);
      return;
    }
    setEditedContent(applyAgent(editedContent, agent.title));
    setSaveError(null);
  };

  const handleConfirmAgentReplace = (pendingTitle: string) => {
    setEditedContent(applyAgent(editedContent, pendingTitle));
    setSaveError(null);
  };

  const handleUnassignAgent = () => {
    setEditedContent(removeAgent(editedContent));
    setSaveError(null);
  };

  const refreshVersions = useCallback(async () => {
    const newVersions = await getItemVersions(item.id);
    setVersions(newVersions);
  }, [item.id]);

  return {
    editedContent,
    title,
    category,
    tags,
    isFavorite,
    isContentDirty,
    committedAgent,
    currentAgentName,
    draftSkillNames,
    isSaving,
    saveError,
    versions,
    availableTags,
    setTitle: (v) => { setTitleState(v); setSaveError(null); },
    setCategory: (v) => { setCategoryState(v); setSaveError(null); },
    setTags: setTagsState,
    setEditedContent,
    setSaveError,
    handleSave,
    handleCancel,
    handleToggleFavorite,
    handleAddTag,
    handleRemoveTag,
    handleRestoreVersion,
    handleAddSkill,
    handleRemoveSkill,
    handleAssignAgent,
    handleConfirmAgentReplace,
    handleUnassignAgent,
    refreshVersions,
  };
}
