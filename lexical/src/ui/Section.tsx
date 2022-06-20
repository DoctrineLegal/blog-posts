import React, { FC } from "react";

export const Section: FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section>
    <h2 className="text-xl">{title}</h2>
    <div className="">{children}</div>
  </section>
);
