import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: { title: string; link: string; snippet: string }[] = [];

    $('.result').each((i, element) => {
      const title = $(element).find('.result__title .result__a').text().trim();
      const link = $(element).find('.result__title .result__a').attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();

      if (title && link && snippet) {
        results.push({ title, link, snippet });
      }
    });

    return NextResponse.json({ results: results.slice(0, 5) }); // Limit to top 5 results
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
