/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "burman.vaxeron.com",
          },
        ],
        destination: "/menu/burman-hotel",
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "foxden.vaxeron.com",
          },
        ],
        destination: "/menu/foxden",
      },
    ];
  },
};

module.exports = nextConfig;