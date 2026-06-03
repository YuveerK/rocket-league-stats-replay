import { useRef, useState, useCallback } from 'react'
import { Upload, FileVideo } from 'lucide-react'

export default function UploadReplay({ onAnalysisStart, compact = false }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.replay')) {
      setError('Only .replay files are accepted')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      body.append('replay', file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? 'Upload failed')
      }
      const { replayPath, replayName } = await res.json()
      onAnalysisStart(replayPath, replayName)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }, [onAnalysisStart])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }
  const onPick = (e) => handleFile(e.target.files[0])

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => inputRef.current.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Upload replay'}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <input ref={inputRef} type="file" accept=".replay" className="hidden" onChange={onPick} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div
        onClick={() => !uploading && inputRef.current.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          w-full max-w-lg border-2 border-dashed rounded-xl p-12 text-center
          transition-colors cursor-pointer select-none
          ${uploading ? 'opacity-50 cursor-not-allowed border-gray-700' :
            dragging ? 'border-blue-500 bg-blue-500/10' :
            'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'}
        `}
      >
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full ${dragging ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
            {uploading
              ? <FileVideo size={32} className="text-blue-400 animate-pulse" />
              : <Upload size={32} className={dragging ? 'text-blue-400' : 'text-gray-500'} />
            }
          </div>
        </div>
        <p className="text-white font-medium mb-1">
          {uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Upload a Rocket League replay'}
        </p>
        <p className="text-gray-500 text-sm">
          {uploading ? 'Please wait' : 'Drag & drop or click to browse — .replay files only'}
        </p>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <input ref={inputRef} type="file" accept=".replay" className="hidden" onChange={onPick} />
    </div>
  )
}
