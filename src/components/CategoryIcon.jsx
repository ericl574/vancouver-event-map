import { getCategoryIconSvg } from "../assets/categoryIcons";

export default function CategoryIcon({ icon = "event", className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center [&_svg]:h-full [&_svg]:w-full [&_svg]:stroke-current ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: getCategoryIconSvg(icon) }}
    />
  );
}
