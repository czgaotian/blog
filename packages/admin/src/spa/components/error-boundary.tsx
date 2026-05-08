import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert } from './ui/alert'
import { Button } from './ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Admin SPA render error', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <Alert title="This page could not be rendered" tone="danger">
          <div className="space-y-3">
            <p>{this.state.error.message}</p>
            <Button type="button" variant="outline" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </div>
        </Alert>
      )
    }

    return this.props.children
  }
}
