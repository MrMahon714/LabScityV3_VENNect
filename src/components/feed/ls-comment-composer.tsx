"use client";

import { Button, Group, Stack, Textarea } from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCommentSchema,
  type CreateCommentValues,
} from "@/lib/validations/post";

/**
 * Props for LSCommentComposer.
 *
 * @param postId - Post to attach the comment to (passed to onAddComment).
 * @param onAddComment - Called with postId and form values (content) on submit.
 * @param isSubmitting - When true, submit button shows loading and form can be disabled.
 */
export interface LSCommentComposerProps {
  postId: string;
  onAddComment: (postId: string, values: CreateCommentValues) => void | Promise<void>;
  isSubmitting?: boolean;
  parentCommentId?: string;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

function noPropagate(fn?: () => void) {
  return (e: React.MouseEvent) => {
    e.stopPropagation();
    fn?.();
  };
}

/**
 * Inline comment form (textarea + Comment button) used inside post cards and on post detail.
 * Resets content on success; on error the hook shows a notification and form is not reset so user can retry.
 */
export function LSCommentComposer({
  postId,
  onAddComment,
  isSubmitting: isMutationPending = false,
  parentCommentId,
  placeholder = "Share a thought...",
  submitLabel = "Comment",
  onCancel,
  autoFocus = false,
}: LSCommentComposerProps) {
  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateCommentValues>({
    resolver: zodResolver(createCommentSchema),
    mode: "onChange",
    defaultValues: {
      content: "",
      parentCommentId,
    },
  });

  const onCommentSubmit = handleSubmit(async (values) => {
    try {
      await onAddComment(postId, values);
      reset({
        content: "",
        parentCommentId,
      });
    } catch {
      // Hook's mutation onError already showed notification; don't reset form so user can retry.
    }
  });

  return (
    <form onSubmit={onCommentSubmit}>
      <Stack gap="sm">
        <Controller 
          name='content'
          control={control}
          render={({ field }) => (
            <Textarea
              labelProps={{ fw: "bold" }}
              placeholder={placeholder}
              error={errors.content?.message}
              styles={{ label: { color: "var(--ls-text-strong)" } }}
              {...register("content")}
              onClick={noPropagate()}
              autoFocus={autoFocus}
            />
          )}
        />
        <Group justify="flex-end">
          {onCancel ? (
            <Button
              type="button"
              variant="default"
              onClick={noPropagate(onCancel)}
              disabled={isSubmitting || isMutationPending}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting || isMutationPending}
            loading={isMutationPending}
            onClick={noPropagate()}
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
