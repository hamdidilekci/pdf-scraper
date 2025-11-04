/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		// Ensure native modules remain external when bundling server components
		serverComponentsExternalPackages: ['pdf-to-img', 'canvas', 'pdfjs-dist'],
		outputFileTracingIncludes: {
			'/api/extract/responses': ['./node_modules/pdf-to-img/**/*', './node_modules/pdfjs-dist/**/*', './node_modules/canvas/**/*']
		}
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Prevent webpack from bundling native modules
			config.externals = config.externals || []
			config.externals.push('canvas')
			config.externals.push('pdf-to-img')
			config.externals.push('pdfjs-dist')
		}
		return config
	}
}

export default nextConfig
