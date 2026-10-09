"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { addMember, type ProjectFormState } from "../actions";
import { PROJECT_ROLES, ROLE_LABELS } from "../roles";

const roleOptions = PROJECT_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

export function AddMemberForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(addMember, {});

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Field
            name="email"
            label="E-mail du membre"
            type="email"
            placeholder="lea@studio.fr"
            defaultValue={state.values?.email}
            required
            errors={state.fieldErrors?.email}
          />
        </div>
        <SelectField
          name="role"
          label="Rôle"
          options={roleOptions}
          defaultValue="reviewer"
          errors={state.fieldErrors?.role}
        />
        <Button type="submit" disabled={pending} className="sm:mt-6.5">
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {state.success}
        </p>
      )}
    </form>
  );
}
