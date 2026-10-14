import {
  Modal,
  Stack,
  Group,
  TextInput,
  Textarea,
  Autocomplete,
  Select,
  Switch,
  Button,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useUserProfile } from "@/components/profile/use-profile";
import { updateProfileAction } from "@/lib/actions/profile";
import {
  getOpenToCollaboration,
  setOpenToCollaboration,
} from "@/lib/actions/collaboration";
import { CAREER_STAGES, CAREER_STAGE_LABELS } from "@/lib/constants/matching";
import { profileKeys } from "@/lib/query-keys";
import { useEffect, useMemo, useState } from "react";
import {
  updateProfileSchema,
  type UpdateProfileValues,
} from "@/lib/validations/profile";
import { useDebouncedValue } from "@mantine/hooks";
import { useLocationSearch, useSkillSearch } from "./use-profile-search";
import { User } from "@/lib/types/feed";
import { IconSparkles } from "@tabler/icons-react";
import { FileButton } from "@mantine/core";

interface EditProfileFormValues {
  firstName: string;
  lastName: string;
  about: string;
  workplace: string;
  occupation: string;
  labDepartment: string;
  location: string;
  timezone: string;
  careerStage: string | null;
  openToCollaboration: boolean;
}

const CAREER_STAGE_OPTIONS = CAREER_STAGES.map((stage) => ({
  value: stage,
  label: CAREER_STAGE_LABELS[stage],
}));

const OPEN_TO_COLLABORATION_KEY = ["open-to-collaboration"];

function profileToEditValues(profile: User | undefined): UpdateProfileValues {
  return {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    about: profile?.about ?? "",
    workplace: profile?.workplace ?? "",
    occupation: profile?.occupation ?? "",
    labDepartment: profile?.lab_department ?? "",
    location: profile?.location ?? "",
    timezone: profile?.timezone ?? "",
    careerStage: profile?.career_stage ?? "",
  };
}

function toFormDefaults(
  v: UpdateProfileValues,
  openToCollaboration: boolean,
): EditProfileFormValues {
  return {
    firstName: v.firstName ?? "",
    lastName: v.lastName ?? "",
    about: v.about ?? "",
    workplace: v.workplace ?? "",
    occupation: v.occupation ?? "",
    labDepartment: v.labDepartment ?? "",
    location: v.location ?? "",
    timezone: v.timezone ?? "",
    careerStage: v.careerStage ?? "",
    openToCollaboration,
  };
}

export interface LSEditProfileModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
}

export function LSEditProfileModal({ opened, onClose, userId }: LSEditProfileModalProps) {
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile(userId);
  
  const initialValues = useMemo(() => profileToEditValues(profile), [profile]);

  const { data: openToCollaboration = true } = useQuery({
    queryKey: OPEN_TO_COLLABORATION_KEY,
    queryFn: async () => {
      const res = await getOpenToCollaboration();
      if (!res.success) throw new Error(res.error ?? "Failed to load setting");
      return res.data ?? true;
    },
    enabled: opened,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      values,
      openToCollaboration: nextOpenToCollaboration,
    }: {
      values: UpdateProfileValues;
      openToCollaboration?: boolean;
    }) => {
      const res = await updateProfileAction(values);
      if (!res.success) throw new Error(res.error ?? "Failed to update profile");

      if (nextOpenToCollaboration !== undefined) {
        const collabRes = await setOpenToCollaboration(nextOpenToCollaboration);
        if (!collabRes.success) {
          throw new Error(
            collabRes.error ?? "Failed to update collaborator setting",
          );
        }
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: profileKeys.user(userId ?? ""),
      });
      queryClient.invalidateQueries({ queryKey: OPEN_TO_COLLABORATION_KEY });
      onClose();
    },
    onError: (err) =>
      notifications.show({
        title: "Could not update profile",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
  });

  const form = useForm<EditProfileFormValues>({
    mode: "uncontrolled",
    initialValues: toFormDefaults(initialValues, openToCollaboration),
  });

  useEffect(() => {
    if (opened) {
      const next = toFormDefaults(initialValues, openToCollaboration);
      form.setInitialValues(next);
      form.setValues(next);
      form.clearErrors();
    }
  }, [opened, initialValues, openToCollaboration]);

    const handleSubmit = form.onSubmit((values) => {
    const { openToCollaboration: wantsOpen, ...profileValues } = values;

    const result = updateProfileSchema.safeParse(profileValues);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!(path in fieldErrors)) fieldErrors[path] = issue.message;
      }
      form.setErrors(fieldErrors);
      return;
    }
    form.clearErrors();

    const careerStageChanged =
      (profileValues.careerStage ?? "") !== (initialValues.careerStage ?? "");

    updateMutation.mutate({
      values: {
        ...result.data,
        careerStage: careerStageChanged ? result.data.careerStage : undefined,
      },
      openToCollaboration:
        wantsOpen !== openToCollaboration ? wantsOpen : undefined,
    });
  });

  const timezones = useMemo(() => {
    try {
      const now = new Date();
      return Intl.supportedValuesOf("timeZone")
        .map((tz) => {
          const offsetStr =
            new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              timeZoneName: "shortOffset",
            })
              .formatToParts(now)
              .find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";

          const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
          const offsetMinutes = match
            ? (match[1] === "-" ? -1 : 1) *
              (parseInt(match[2]) * 60 + parseInt(match[3] ?? "0"))
            : 0;

          return {
            value: tz,
            label: `${tz.replace(/_/g, " ")} (${offsetStr})`,
            offsetMinutes,
          };
        })
        .sort((a, b) => a.offsetMinutes - b.offsetMinutes);
    } catch {
      return [];
    }
  }, []);

  const [skillSearch, setSkillSearch] = useState("");
  const [debouncedSkill] = useDebouncedValue(skillSearch, 300);

  // const skillOptions = useMemo(() => {
  //   const map = new Map();
  //   for (const s of selectedSkills) map.set(s.value, s);
  //   for (const r of skillResults ?? []) {
  //     const v = String(r.id);
  //     if(!map.has(v)) map.set(v, { value: v, label: r.name });
  //   }
  //   return [...map.values()];
  // }, [selectedSkills, skillResults]);

  const [locationSearch, setLocationSearch] = useState("");
  const [debouncedLocation] = useDebouncedValue(locationSearch, 500);
  const { data: locationResults, isFetching: isLocationFetching } = useLocationSearch(debouncedLocation);

  const locationOptions = useMemo(
    () => (locationResults ?? []).map((r) => r.display_name),
    [locationResults],
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Profile"
      centered
      size="lg"
      yOffset="5vh"
      styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap={12}>
          <Group grow>
            <TextInput
              withAsterisk
              label="First Name"
              key={form.key("firstName")}
              {...form.getInputProps("firstName")}
            />
            <TextInput
              withAsterisk
              label="Last Name"
              key={form.key("lastName")}
              {...form.getInputProps("lastName")}
            />
          </Group>

                      <Stack gap="4">
            <Textarea
              label="About"
              placeholder="Tell others about yourself..."
              description="Max 256 characters"
              key={form.key("about")}
              {...form.getInputProps("about")}
            />
            <FileButton
              onChange={(file) => console.log("Resume uploaded for About Me:", file)}
              accept=".pdf,.doc,.docx,.txt"
            >
              {(props: any) => (
                <Button
                  {...props}
                  variant="subtle"
                  size="xs"
                  w="fit-content"
                  leftSection={<IconSparkles size="0.9rem" />}
                >
                  Generate About Me From File
                </Button>
              )}
            </FileButton>
          </Stack>

          <TextInput
            label="Institution / Workplace"
            placeholder="Select or type..."
            key={form.key("workplace")}
            {...form.getInputProps("workplace")}
          />
          
          <TextInput
            label="Occupation"
            placeholder="Select or type..."
            key={form.key("occupation")}
            {...form.getInputProps("occupation")}
          />

          <Select
            label="Career Stage"
            placeholder="Select your career stage"
            data={CAREER_STAGE_OPTIONS}
            clearable
            key={form.key("careerStage")}
            {...form.getInputProps("careerStage")}
          />

          <TextInput
            label="Lab / Department"
            placeholder="e.g. Computer Science and AI Laboratory"
            key={form.key("labDepartment")}
            {...form.getInputProps("labDepartment")}
          />

          <Autocomplete
            label="Location"
            placeholder="Search for a city or place..."
            data={locationOptions}
            rightSection={isLocationFetching ? <Loader size="xs" /> : null}
            onChangeCapture={(e) => setLocationSearch(e.currentTarget.value)}
            key={form.key("location")}
            {...form.getInputProps("location")}
          />

          <Select
            label="Time Zone"
            placeholder="Select your time zone"
            data={timezones}
            comboboxProps={{ shadow: 'md' }}
            searchable
            clearable
            nothingFoundMessage="No matching time zone"
            key={form.key("timezone")}
            {...form.getInputProps("timezone")}
          />

          <Switch
            label="Include me in collaborator recommendations"
            description="When off, you won't appear in other people's recommended collaborators."
            key={form.key("openToCollaboration")}
            {...form.getInputProps("openToCollaboration", { type: "checkbox" })}
          />

          <Button type="submit" loading={updateMutation.isPending}>
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
