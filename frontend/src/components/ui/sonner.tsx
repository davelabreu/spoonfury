import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#18181b",
          "--normal-border": "#e4e4e7",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
