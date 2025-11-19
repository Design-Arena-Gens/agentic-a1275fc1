import "./globals.css";

export const metadata = {
  title: "Video Prompt Generator",
  description:
    "Generate structured AI prompts directly from your video footage."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
