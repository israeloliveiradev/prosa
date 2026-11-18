import { useState, type ReactNode } from "react";
import { Pressable, View, useWindowDimensions, type StyleProp, type ViewStyle, type DimensionValue } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";

export interface TableColumn<T = any> {
  key: string;
  label?: string;
  header?: string;
  align?: "left" | "center" | "right";
  width?: DimensionValue;
  flex?: number;
  numeric?: boolean;
  render?: (row: T) => ReactNode;
}

export interface TableProps<T = any> {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  keyExtractor?: (row: T, index: number) => string;
  onRowPress?: (row: T) => void;
  empty?: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Table<T = any>({
  columns,
  rows,
  keyExtractor = (_, i) => String(i),
  onRowPress,
  empty = "Nenhum registro encontrado.",
  testID,
  style,
  className,
}: TableProps<T>) {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 640;

  if (rows.length === 0) {
    return (
      <View
        testID={testID}
        style={[
          {
            padding: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.sheet,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: palette.border,
          },
          style,
        ]}
        className={className}
      >
        {typeof empty === "string" ? (
          <Text variant="body" tone="muted">
            {empty}
          </Text>
        ) : (
          empty
        )}
      </View>
    );
  }

  // Narrow screen mode: render 2-line list cards
  if (isNarrow) {
    return (
      <View testID={testID} style={style} className={`gap-2 ${className ?? ""}`}>
        {rows.map((row, index) => {
          const key = keyExtractor(row, index);
          const firstCol = columns[0];
          const secondCol = columns[1];
          const restCols = columns.slice(2);

          return (
            <Pressable
              key={key}
              testID={testID ? `${testID}-row-${key}` : undefined}
              accessibilityRole={onRowPress ? "button" : "none"}
              onPress={onRowPress ? () => onRowPress(row) : undefined}
              style={{
                backgroundColor: palette.sheet,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: radius.card,
                padding: 12,
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text variant="body" tone="ink" weight="500">
                  {firstCol.render ? firstCol.render(row) : (row as any)[firstCol.key]}
                </Text>
                {secondCol && (
                  <Text variant="small" numeric={secondCol.numeric} tone="muted">
                    {secondCol.render ? secondCol.render(row) : (row as any)[secondCol.key]}
                  </Text>
                )}
              </View>
              {restCols.length > 0 && (
                <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
                  {restCols.map((col) => (
                    <View key={col.key} className="flex-row items-center gap-1">
                      <Text variant="small" tone="faint">
                        {col.label}:
                      </Text>
                      <Text variant="small" numeric={col.numeric} tone="ink">
                        {col.render ? col.render(row) : (row as any)[col.key]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  // Desktop / Table mode
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: palette.sheet,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: radius.card,
          overflow: "hidden",
        },
        style,
      ]}
      className={className}
    >
      {/* Table Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
          paddingHorizontal: 16,
          height: 36,
          backgroundColor: palette.raised,
        }}
      >
        {columns.map((col) => (
          <View
            key={col.key}
            style={{
              flex: col.flex ?? (col.width ? undefined : 1),
              width: col.width,
              alignItems: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
            }}
          >
            <Text variant="small" tone="muted" weight="500">
              {col.header ?? col.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Table Rows */}
      {rows.map((row, index) => {
        const key = keyExtractor(row, index);
        return (
          <TableRow
            key={key}
            row={row}
            columns={columns}
            onPress={onRowPress ? () => onRowPress(row) : undefined}
            testID={testID ? `${testID}-row-${key}` : undefined}
            isLast={index === rows.length - 1}
          />
        );
      })}
    </View>
  );
}

function TableRow({
  row,
  columns,
  onPress,
  testID,
  isLast,
}: {
  row: any;
  columns: readonly TableColumn[];
  onPress?: () => void;
  testID?: string;
  isLast: boolean;
}) {
  const { palette } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? "button" : "none"}
      disabled={!onPress}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        height: 44,
        backgroundColor: isHovered && onPress ? palette.raised : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: palette.borderSoft,
      }}
    >
      {columns.map((col) => {
        const content = col.render ? col.render(row) : row[col.key];
        return (
          <View
            key={col.key}
            style={{
              flex: col.flex ?? (col.width ? undefined : 1),
              width: col.width,
              alignItems: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
            }}
          >
            {typeof content === "string" || typeof content === "number" ? (
              <Text variant="body" tone="ink" numeric={col.numeric}>
                {content}
              </Text>
            ) : (
              content
            )}
          </View>
        );
      })}
    </Pressable>
  );
}
