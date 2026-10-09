"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { createProject, type ProjectFormState } from "../actions";
import { PROJECT_ROLES, ROLE_LABELS } from "../roles";

const roleOptions = PROJECT_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

export function CreateProjectForm() {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(createProject, {});

  return (
    <form action={action} className="flex flex-col gap-4 sm:flex-row sm:items-start" noValidate>
      <div className="flex-1">
        <Field
          name="name"
          label="Nom du projet"
          placeholder="Teaser Nike"
          defaultValue={state.values?.name}
          required
          errors={state.fieldErrors?.name}
        />
      </div>
      <SelectField
        name="role"
        label="Mon rôle"
        options={roleOptions}
        defaultValue={state.values?.role}
        errors={state.fieldErrors?.role}
      />
      <Button type="submit" disabled={pending} className="sm:mt-6.5">
        {pending ? "Création…" : "Créer le projet"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
