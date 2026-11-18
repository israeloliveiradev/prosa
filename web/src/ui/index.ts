// Hooks
export { useBreakpoint } from "./hooks/use-breakpoint";
export { usePointer } from "./hooks/use-pointer";
export { useReducedMotion } from "./hooks/use-reduced-motion";
export { useHaptics } from "./hooks/use-haptics";
export { useFocusOnError } from "./hooks/use-focus-on-error";

// Group 1: Typography & Media
export { Text, type TextProps } from "./text";
export { Icon, type IconProps } from "./icon";

// Group 2: Actions
export { Button, type ButtonProps } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { TextAction, type TextActionProps } from "./text-action";

// Group 3: Surfaces & Containers
export { Card, type CardProps } from "./card";
export { Well, type WellProps } from "./well";
export { Surface, type SurfaceProps } from "./surface";

// Group 4: Inputs & Forms
export { Field, type FieldProps } from "./field";
export { OtpField, type OtpFieldProps } from "./otp-field";
export { Segmented, type SegmentedProps, type SegmentedOption } from "./segmented";
export { Tabs, type TabsProps, type TabItem } from "./tabs";
export { Switch, type SwitchProps } from "./switch";
export { Checkbox, type CheckboxProps } from "./checkbox";
export { RadioGroup, type RadioGroupProps, type RadioOption } from "./radio-group";
export { Chip, type ChipProps } from "./chip";
export { Select, type SelectProps, type SelectOption } from "./select";

// Group 5: Data Display & Feedback
export { Pill, type PillProps } from "./pill";
export { ListRow, type ListRowProps } from "./list-row";
export { Table, type TableProps, type TableColumn } from "./table";
export { KpiStrip, type KpiStripProps, type KpiItem } from "./kpi-strip";
export { Progress, type ProgressProps } from "./progress";
export { Skeleton, type SkeletonProps } from "./skeleton";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { InlineError, type InlineErrorProps } from "./inline-error";

// Group 6: Overlays & Feedback
export { Glass, type GlassProps } from "./glass";
export { Sheet, type SheetProps } from "./sheet";
export { Dialog, type DialogProps, type DialogAction } from "./dialog";
export { Popover, type PopoverProps } from "./popover";
export { Menu, type MenuProps, type MenuItem, type MenuEntry } from "./menu";
export { Tooltip, type TooltipProps } from "./tooltip";
export { toast, Toaster, type ToastOptions, type ToastTone } from "./toast";

// Group 7: Identity & Structural
export { Avatar, type AvatarProps } from "./avatar";
export { Flag, type FlagProps } from "./flag";
export { PageHeader, type PageHeaderProps } from "./page-header";
export { Stepper, type StepperProps } from "./stepper";
export { Kbd, type KbdProps } from "./kbd";
