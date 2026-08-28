import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'pase/:code',
    loadComponent: () => import('./pages/pass-public.page').then((m) => m.PassPublicPageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent) },
      { path: 'prensas', loadComponent: () => import('./pages/presses.page').then((m) => m.PressesPageComponent) },
      { path: 'prensas/:id', loadComponent: () => import('./pages/press-detail.page').then((m) => m.PressDetailPageComponent) },
      { path: 'bono', loadComponent: () => import('./pages/pass-builder.page').then((m) => m.PassBuilderPageComponent) },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'confirmacion/:code',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPageComponent),
      },
      {
        path: 'mi-pase',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/my-passes.page').then((m) => m.MyPassesPageComponent),
      },
      {
        path: 'mi-pase/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/pass-detail.page').then((m) => m.PassDetailPageComponent),
      },
      {
        path: 'sello',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/stamp.page').then((m) => m.StampPageComponent),
      },
      {
        path: 'staff',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPageComponent),
      },
      {
        path: 'cuenta',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/account.page').then((m) => m.AccountPageComponent),
      },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent) },
    ],
  },
];
