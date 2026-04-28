import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Ito ang cheat code natin para pilitin ang Tailwind na gumana */}
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <body className="bg-gray-50">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}