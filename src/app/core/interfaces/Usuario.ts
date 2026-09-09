//registro
export interface IAuthData {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento: string;
    tipo_sangre: string;
    color_ojos: string;
    dias_vacaciones: number;
}
// BD
export interface IUsuario {
    id?: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento: string;
    tipo_sangre: string;
    color_ojos: string;
    dias_vacaciones: number;
    cupon_usado?: boolean;
    rol?: string;
}