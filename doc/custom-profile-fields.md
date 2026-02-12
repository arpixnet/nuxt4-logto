# Custom Profile Fields

This document explains how to add custom fields to the user profile using Logto's `custom_data`.

## Architecture

Custom fields are stored in Logto under the `custom_data` field, which is a JSON object that can contain any data structure. The application uses the `UserScope.CustomData` scope to read and write this data.

## Steps to Add a New Custom Field

### 1. Add Translations

Add translations in the language files:

**`i18n/locales/en.json`**
```json
{
  "profile": {
    "yourNewField": "New Field Label"
  }
}
```

**`i18n/locales/es.json`**
```json
{
  "profile": {
    "yourNewField": "Etiqueta del Nuevo Campo"
  }
}
```

### 2. Update Form State

In `app/pages/profile.vue`, modify `profileFormState` to include the new field:

```typescript
const profileFormState = reactive<{
  name: string
  username: string
  email: string
  phone: string
  address: string
  yourNewField: string  // <-- Add here
}>({
  name: session.value?.user?.name || '',
  username: session.value?.user?.username || '',
  email: session.value?.user?.email || '',
  phone: (session.value?.user?.phoneNumber as string) || '',
  address: (session.value?.user?.custom_data?.address as string) || '',
  yourNewField: (session.value?.user?.custom_data?.yourNewField as string) || ''  // <-- Initialize
})
```

### 3. Update Validation Schema

Add the field to the Zod schema:

```typescript
const schemaProfile = computed(() => z.object({
  name: z.string().min(1, t('validation.nameRequired')),
  username: z.string().optional(),
  email: z.string().email(t('validation.emailInvalid')),
  phone: z.string().optional(),
  address: z.string().optional(),
  yourNewField: z.string().optional()  // <-- Add here
}))
```

### 4. Update Submit Function

Modify `onProfileSubmit` to include the new field in `customData`:

```typescript
async function onProfileSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    await updateProfile({
      name: event.data.name,
      username: event.data.username,
      customData: {
        address: event.data.address,
        yourNewField: event.data.yourNewField  // <-- Add here
      }
    })
    toast.add({ title: t('profile.toasts.profileUpdated'), color: 'success' })
  } catch {
    toast.add({ title: t('profile.errors.updateProfile'), color: 'error' })
  }
}
```

### 5. Add Field to Template

Add the field in the profile form:

```vue
<UFormField
  :label="t('profile.yourNewField')"
  name="yourNewField"
>
  <UInput
    v-model="profileFormState.yourNewField"
    icon="i-heroicons-your-icon"
    class="w-full"
  />
</UFormField>
```

## Important Considerations

### Data Overwrite

Logto's API **completely overwrites** the `custom_data` object; it does not merge. For this reason, when updating a field, you **must include all existing fields** in `customData`.

Correct example:
```typescript
customData: {
  address: event.data.address,
  otherField: event.data.otherField,
  // All fields must be included
}
```

### Data Types

Custom fields can be of different types:
- `string`: Simple text
- `number`: Numbers
- `boolean`: True/false values
- `object`: Nested objects
- `array`: Arrays

### Server Access

To access custom fields from the server:

```typescript
// In a server endpoint
const session = event.context.session as { user?: { custom_data?: Record<string, unknown> } }
const yourField = session?.user?.custom_data?.yourNewField
```

## Complete Example: "Birth Date" Field

### 1. Translations
```json
// en.json
"profile": {
  "birthDate": "Birth Date"
}

// es.json
"profile": {
  "birthDate": "Fecha de Nacimiento"
}
```

### 2. Form State
```typescript
const profileFormState = reactive({
  // ... other fields
  birthDate: (session.value?.user?.custom_data?.birthDate as string) || ''
})
```

### 3. Schema
```typescript
const schemaProfile = computed(() => z.object({
  // ... other fields
  birthDate: z.string().optional()
}))
```

### 4. Submit Function
```typescript
await updateProfile({
  name: event.data.name,
  username: event.data.username,
  customData: {
    address: event.data.address,
    birthDate: event.data.birthDate
  }
})
```

### 5. Template
```vue
<UFormField
  :label="t('profile.birthDate')"
  name="birthDate"
>
  <UInput
    v-model="profileFormState.birthDate"
    type="date"
    icon="i-heroicons-calendar"
    class="w-full"
  />
</UFormField>
```

## Email Update

The user's email **cannot be changed directly** like a normal field. Logto requires a verification process:

1. Request verification code to the new email
2. Verify the received code
3. Call `/api/my-account/primary-email` with the verification ID

This process is more complex and requires additional implementation. For now, the email field is disabled in the form.

## References

- [Logto Account API Documentation](https://docs.logto.io/end-user-flows/account-settings/by-account-api)
- [Logto Custom Data](https://docs.logto.io/user-management/user-data#custom-data)
- [Zod Validation](https://zod.dev/)
