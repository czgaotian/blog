import { useState, useEffect, useRef } from 'react'
import { useProfile, useUpdateProfile, useChangePassword, useUploadAvatar } from '../api/profile'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { AdminApiError } from '../api/client'

export function ProfilePage() {
  const { data, isLoading, isError } = useProfile()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const uploadAvatar = useUploadAvatar()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [language, setLanguage] = useState('en')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [profileSaved, setProfileSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName)
      setLastName(data.lastName)
      setUsername(data.username)
      setEmail(data.email)
      setPhone(data.phone ?? '')
      setBio(data.bio ?? '')
      setTimezone(data.timezone)
      setLanguage(data.language)
      setEmailNotifications(data.emailNotifications)
    }
  }, [data])

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaved(false)
    await updateProfile.mutateAsync({
      firstName, lastName, username, email,
      phone: phone || undefined,
      bio: bio || undefined,
      timezone, language, emailNotifications,
    })
    setProfileSaved(true)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordSaved(false)
    await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword })
    setPasswordSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatar.mutateAsync(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) return <LoadingState label="Loading profile" />
  if (isError) return <Alert title="Failed to load profile" tone="danger">Try refreshing.</Alert>

  return (
    <section className="space-y-10">
      <PageHeader title="Profile" description="Manage your account settings." />

      <div className="flex items-center gap-6 max-w-lg">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground shrink-0">
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span>{(data?.firstName?.[0] ?? '?').toUpperCase()}</span>
          )}
        </div>
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAvatar.isPending}>
            {uploadAvatar.isPending ? 'Uploading…' : 'Change avatar'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP, max 5MB</p>
          {uploadAvatar.isError && (
            <p className="text-xs text-destructive">
              {uploadAvatar.error instanceof AdminApiError ? uploadAvatar.error.message : 'Upload failed'}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal info</h2>

        {updateProfile.isError && (
          <Alert title="Save failed" tone="danger">
            {updateProfile.error instanceof AdminApiError ? updateProfile.error.message : 'Unexpected error'}
          </Alert>
        )}
        {profileSaved && <Alert title="Saved" tone="success">Profile updated.</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Input id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Optional" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" value={timezone} onChange={e => setTimezone(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="language">Language</Label>
          <Input id="language" value={language} onChange={e => setLanguage(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={e => setEmailNotifications(e.target.checked)}
            className="rounded border-input"
          />
          Email notifications
        </label>

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change password</h2>

        {changePassword.isError && (
          <Alert title="Password change failed" tone="danger">
            {changePassword.error instanceof AdminApiError ? changePassword.error.message : 'Unexpected error'}
          </Alert>
        )}
        {passwordSaved && <Alert title="Done" tone="success">Password changed.</Alert>}

        <div className="grid gap-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>

        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
