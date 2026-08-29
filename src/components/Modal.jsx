import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function Modal({ title, children, onClose, footer }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    dialog.showModal()
    const cancel = (event) => { event.preventDefault(); onClose() }
    dialog.addEventListener('cancel', cancel)
    return () => {
      dialog.removeEventListener('cancel', cancel)
      if (dialog.open) dialog.close()
    }
  }, [onClose])

  return (
    <dialog className="modal-backdrop" ref={dialogRef} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" aria-label={title}>
        <header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
        <div className="modal-content">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </dialog>
  )
}
