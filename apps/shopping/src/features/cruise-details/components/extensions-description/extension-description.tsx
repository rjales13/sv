import { cn } from '@vikings/ui/lib/utils';

export interface ExtensionDescriptionProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Prose description. Renders as a paragraph when provided without `bullets`. */
  text?: string;
  /** Bullet points. When provided, renders as a disc list instead of the paragraph. */
  bullets?: string[];
}

export function ExtensionDescription({
  text,
  bullets,
  className,
  ...divProps
}: ExtensionDescriptionProps) {
  return (
    <div
      data-slot="extension-description"
      className={cn('flex flex-col gap-5 pt-3', className)}
      {...divProps}
    >
      {text && <p className="text-body-sm font-normal text-ink">{text}</p>}
      {bullets && bullets.length > 0 && (
        <ul
          className="list-disc text-body-sm font-normal text-ink"
          style={{ paddingInlineStart: '19.5px' }}
        >
          {bullets.map((item) => (
            <li key={item} className="leading-none">
              <span className="leading-normal">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
