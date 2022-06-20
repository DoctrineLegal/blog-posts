import { FC } from "react";

export const Button: FC<
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & { active?: boolean }
> = ({ children, disabled, active, ...rest }) => {
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";
  const baseClass = "text-white font-bold py-2 px-4 border-b-4 rounded";
  const activeClass = active
    ? "bg-green-500 border-green-700 hover:border-green-500 hover:bg-green-400"
    : "bg-blue-700 border-blue-700 hover:border-blue-500 hover:bg-blue-400";

  return (
    <button
      {...rest}
      disabled={disabled}
      className={`${baseClass} ${activeClass} ${disabledClass}`}
    >
      {children}
    </button>
  );
};
