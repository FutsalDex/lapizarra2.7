import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">Página no encontrada</h2>
      <Link href="/" className="mt-4 text-blue-500 underline">
        Volver al inicio
      </Link>
    </div>
  )
}