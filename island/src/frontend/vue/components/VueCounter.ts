import { defineComponent, h, ref } from "vue";
import { useIslandStore } from "@absolutejs/absolute/vue";
import { counterIslandStore } from "../../islands/counterStore";

export const VueCounter = defineComponent({
  name: "VueCounter",
  props: {
    initialCount: {
      required: true,
      type: Number,
    },
    label: {
      required: true,
      type: String,
    },
  },
  setup(props) {
    const count = ref(props.initialCount);
    const sharedCount = useIslandStore(
      counterIslandStore,
      (state) => state.sharedCount,
    );
    const incrementShared = useIslandStore(
      counterIslandStore,
      (state) => state.incrementShared,
    );

    return () =>
      h("div", { class: "island-card island-card-vue" }, [
        h("div", { class: "island-header" }, [
          h("img", { alt: "Vue", height: 20, src: "/assets/svg/vue-logo.svg" }),
          h("span", props.label),
        ]),
        h("strong", `Local: ${String(count.value)}`),
        h("strong", `Shared: ${String(sharedCount.value)}`),
        h(
          "button",
          {
            type: "button",
            onClick: () => {
              count.value += 1;
            },
          },
          "Increment Vue",
        ),
        h(
          "button",
          {
            type: "button",
            onClick: () => {
              incrementShared.value();
            },
          },
          "Increment Shared",
        ),
      ]);
  },
});
