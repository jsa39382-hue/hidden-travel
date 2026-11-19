import { Component, type ReactNode } from 'react'

/** 한 섹션에서 예상치 못한 오류가 나도 나머지 화면은 계속 쓸 수 있게 막아 준다 */
export class SectionBoundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.name}]`, error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <p className="font-medium">{this.props.name} 화면을 그리다가 문제가 생겼어요.</p>
        <p className="mt-1 text-xs text-rose-600">다른 기능은 그대로 쓸 수 있어요. 계속되면 아래 '저장된 데이터 지우기'를 눌러 보세요.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white active:bg-rose-700"
        >
          다시 시도
        </button>
      </div>
    )
  }
}
