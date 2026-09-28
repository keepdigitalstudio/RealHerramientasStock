export function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </section>
  );
}
