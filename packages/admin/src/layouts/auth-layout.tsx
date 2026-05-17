import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Outlet />
    </div>
  )
}
