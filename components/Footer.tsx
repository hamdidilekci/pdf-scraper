import { Separator } from '@/components/ui/separator'

export default function Footer() {
	return (
		<footer className="border-t bg-background">
			<div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
				<p>&copy; {new Date().getFullYear()} PDF Scraper. All rights reserved.</p>
			</div>
		</footer>
	)
}
