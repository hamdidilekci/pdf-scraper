import '@/styles/globals.css'
import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
	title: 'PDF Scraper App',
	description: 'Upload PDFs and extract structured data'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<body className="min-h-screen flex flex-col">
				<Providers>
					<Navbar />
					<main className="mx-auto max-w-5xl px-4 py-4 md:py-8 flex-1 w-full">{children}</main>
					<Footer />
				</Providers>
			</body>
		</html>
	)
}
