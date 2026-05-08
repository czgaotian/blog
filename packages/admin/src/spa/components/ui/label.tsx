import { cn } from '../../lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn('block text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}
