/**
 * O atributo `switch` de `<input type="checkbox">` (Safari 17.4+) ainda não
 * existe nos tipos do React. Declarar aqui uma vez evita repetir `as any` nos
 * componentes de navegação.
 *
 * Para que serve esse switch: ele é o único caminho de retorno tátil no
 * iPhone — o toque físico no controle nativo aciona a Taptic Engine.
 * O porquê inteiro está em `src/lib/haptics.ts`.
 */

import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- o parâmetro precisa ter o mesmo nome da declaração original do React para as interfaces se fundirem
  interface InputHTMLAttributes<T> {
    switch?: "" | boolean;
  }
}
