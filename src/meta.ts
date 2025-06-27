export class Tools {
  status = "";
  tools: Record<string, (_: Record<string, string>) => string> = {};
  oaiSpec: object[] = [];
}

export function tool(description: string, parameters: Record<string, string>) {
  return <T extends Tools>(
    originalMethod: (args: Record<string, string>) => string,
    context: ClassMethodDecoratorContext<
      T,
      (args: Record<string, string>) => string
    >,
  ) => {
    context.addInitializer(function () {
      this.tools[context.name.toString()] = originalMethod;
      this.oaiSpec.push({
        name: context.name.toString(),
        arguments: {
          description,
          properties: Object.fromEntries(
            Object.entries(parameters).map((
              [name, description],
            ) => [name, {
              type: "string",
              description,
            }]),
          ),
        },
      });
    });
    return originalMethod;
  };
}

export function status(description: string) {
  return <T extends Tools>(
    originalMethod: () => string,
    context: ClassMethodDecoratorContext<T>,
  ) => {
    context.addInitializer(function () {
      this.status = context.name.toString();
      this.oaiSpec.push({
        name: context.name.toString(),
        arguments: { description },
      });
    });
    return originalMethod;
  };
}
