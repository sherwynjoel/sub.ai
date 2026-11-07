/** The product's name as the logo writes it: a subtitle line under its double m. */
export default function LogoName({ name }: { name: string }) {
  return <span>{name.slice(0, -2)}<span className="logo-mm">{name.slice(-2)}</span></span>;
}
