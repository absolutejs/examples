import { SuspenseSlot } from "@absolutejs/absolute/react/components";
import { FallbackCard } from "./FallbackCard";
import { ResolvedCard, type SlotData } from "./ResolvedCard";

type FrameworkSlotProps = {
  declaredOrder: string;
  expectedResolveOrder: string;
  id: string;
  label: string;
  promise: Promise<SlotData>;
  timeoutMs: number;
};

export const FrameworkSlot = ({
  declaredOrder,
  expectedResolveOrder,
  id,
  label,
  promise,
  timeoutMs,
}: FrameworkSlotProps) => (
  <SuspenseSlot
    fallback={
      <FallbackCard
        declaredOrder={declaredOrder}
        expectedResolveOrder={expectedResolveOrder}
        label={label}
      />
    }
    id={id}
    promise={promise}
    timeoutMs={timeoutMs}
  >
    {(value: SlotData) => (
      <ResolvedCard data={value} declaredOrder={declaredOrder} />
    )}
  </SuspenseSlot>
);
