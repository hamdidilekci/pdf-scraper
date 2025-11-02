/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		// Ensure native modules remain external when bundling server components
		serverComponentsExternalPackages: ['pdf-to-img', 'canvas']
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Prevent webpack from bundling native modules
			config.externals = config.externals || []
			config.externals.push('canvas')
			config.externals.push('pdf-to-img')
		}
		return config
	}
}

export default nextConfig
