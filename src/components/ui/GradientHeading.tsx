import React from 'react';
import clsx from 'clsx';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4';

interface GradientHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingTag;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const sizeMap: Record<NonNullable<GradientHeadingProps['size']>, string> = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
  xl: 'text-4xl sm:text-5xl',
};

export default function GradientHeading({
  as: Tag = 'h1',
  size = 'md',
  className,
  children,
  ...rest
}: GradientHeadingProps) {
  const TagComponent = Tag as unknown as React.ElementType;
  return (
    <TagComponent
      className={clsx(
        'font-extrabold tracking-tight bg-gradient-to-r from-red-600 via-orange-500 to-orange-400 bg-clip-text text-transparent',
        sizeMap[size],
        className
      )}
      {...rest}
    >
      {children}
    </TagComponent>
  );
}
