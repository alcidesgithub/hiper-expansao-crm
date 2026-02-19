import { redirect } from 'next/navigation';

type AssociarSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AssociarPage({
    searchParams,
}: {
    searchParams?: AssociarSearchParams;
}) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const query = new URLSearchParams();

    if (resolvedSearchParams) {
        for (const [key, value] of Object.entries(resolvedSearchParams)) {
            if (typeof value === 'string' && value.trim()) {
                query.set(key, value);
            }
        }
    }

    redirect(query.size > 0 ? `/funnel/gate?${query.toString()}` : '/funnel/gate');
}
