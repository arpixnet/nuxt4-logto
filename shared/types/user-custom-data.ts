/**
 * User custom data stored in Logto
 *
 * This interface defines the structure of custom user data fields
 * stored in Logto's custom_data field.
 *
 * Add new custom fields here and they will be available in both
 * server and client code.
 */
export interface UserCustomData {
  address?: string
  birthDate?: string
  // Add more custom fields here as needed
  [key: string]: unknown
}
