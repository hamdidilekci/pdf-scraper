import '@/styles/globals.css'
import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
	title: 'PDF Scraper App',
	description: 'Upload PDFs and extract structured data'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<Providers>
					<Navbar />
					<main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
					<Footer />
					<Toaster position="top-right" richColors />
				</Providers>
			</body>
		</html>
	)
}
