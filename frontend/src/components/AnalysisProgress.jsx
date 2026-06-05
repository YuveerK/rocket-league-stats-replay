import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader, X, AlertCircle } from 'lucide-react'
import { apiUrl } from '@/services/apiClient'

export default function AnalysisProgress({ replayPath, replayName, onComplete }) {
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [total, setTotal] = useState(12)
  const [status, setStatus] = useState('running') // running | complete | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!replayPath) return

    const es = new EventSource(apiUrl(`/api/analyze?replayPath=${encodeURIComponent(replayPath)}`))

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.type === 'step') {
        setTotal(data.total)
        setCurrentStep(data.step)
        setSteps((prev) => {
          const next = [...prev]
          // Mark all previous as done
          for (let i = 0; i < data.step - 1; i++) {
            if (next[i]) next[i] = { ...next[i], status: 'done' }
          }
          next[data.step - 1] = { label: data.label, status: 'running' }
          return next
        })
      } else if (data.type === 'complete') {
        setStatus('complete')
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })))
        es.close()
        // Short delay so user can see all green before the data refreshes
        setTimeout(onComplete, 900)
      } else if (data.type === 'error') {
        setStatus('error')
        setErrorMsg(data.message)
        setSteps((prev) =>
          prev.map((s, i) => (i === prev.length - 1 ? { ...s, status: 'error' } : s)),
        )
        es.close()
      }
    }

    es.onerror = () => {
      setStatus('error')
      setErrorMsg('Lost connection to the analysis server.')
      es.close()
    }

    return () => es.close()
  }, [replayPath, onComplete])

  const pct = total > 0 ? Math.round((currentStep / total) * 100) : 0

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Analysing replay</p>
          <p className="text-white font-semibold truncate">{replayName}</p>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'error' ? 'bg-red-500' :
                status === 'complete' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${status === 'complete' ? 100 : pct}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-600 mt-1">
            {status === 'complete' ? 'Done' : status === 'error' ? 'Failed' : `${currentStep} / ${total}`}
          </p>
        </div>

        {/* Steps list */}
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {steps.length === 0 && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader size={14} className="animate-spin shrink-0" />
              Starting analysis…
            </div>
          )}
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                {step.status === 'done' && <Check size={14} className="text-green-400" />}
                {step.status === 'running' && <Loader size={14} className="text-blue-400 animate-spin" />}
                {step.status === 'error' && <X size={14} className="text-red-400" />}
              </span>
              <span className={
                step.status === 'done' ? 'text-gray-500' :
                step.status === 'running' ? 'text-white font-medium' :
                step.status === 'error' ? 'text-red-400' : 'text-gray-600'
              }>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error message */}
        {status === 'error' && (
          <div className="mx-6 mb-6 flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}
