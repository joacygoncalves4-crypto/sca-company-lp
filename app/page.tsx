import { redirect } from "next/navigation";

// Redireciona a raiz "/" para a landing page, PRESERVANDO os parâmetros da URL
// (fbclid, utm_*, etc.). Sem isso, o fbclid do clique do anúncio se perde e a
// Meta não consegue atribuir a conversão à campanha.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else if (value !== undefined) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(query ? `/lp.html?${query}` : "/lp.html");
}
