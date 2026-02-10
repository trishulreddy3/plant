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
        'font-black tracking-tight bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 bg-clip-text text-transparent drop-shadow-sm',
        sizeMap[size],
        className
      )}
      {...rest}
    >
      {children}
    </TagComponent>
  );
}
